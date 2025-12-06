const express = require('express');
const Docker = require('dockerode');
const bodyParser = require('body-parser');
const { resolvePlugin, resolveMod } = require('./resolvers');

const app = express();
const docker = new Docker();
const port = 3000;
const MAX_SERVERS = 5;

app.use(bodyParser.json());

// Helper to format container data
const formatContainer = (containerInfo) => {
    const ports = containerInfo.Ports || [];
    const mcPort = ports.find(p => p.PrivatePort === 25565);

    return {
        id: containerInfo.Id,
        name: containerInfo.Names ? containerInfo.Names[0].replace('/', '') : 'Unknown',
        image: containerInfo.Image,
        state: containerInfo.State,
        status: containerInfo.Status,
        connection: mcPort ? {
            host: 'localhost',
            port: mcPort.PublicPort
        } : null
    };
};

// LIST SERVERS
app.get('/servers', async (req, res) => {
    try {
        const containers = await docker.listContainers({
            all: true,
            filters: { ancestor: ['itzg/minecraft-server'] }
        });
        const formatted = containers.map(formatContainer);
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET SERVER
app.get('/servers/:id', async (req, res) => {
    try {
        const container = docker.getContainer(req.params.id);
        const data = await container.inspect();

        // Inspect returns a different structure for ports than listContainers
        const portBindings = data.NetworkSettings.Ports['25565/tcp'];
        const publicPort = portBindings ? portBindings[0].HostPort : null;

        res.json({
            id: data.Id,
            name: data.Name.replace('/', ''),
            state: data.State.Status,
            connection: publicPort ? {
                host: 'localhost',
                port: publicPort
            } : null,
            env: data.Config.Env
        });
    } catch (error) {
        res.status(404).json({ error: 'Server not found' });
    }
});

// CREATE SERVER
app.post('/servers', async (req, res) => {
    const { version, type, name, plugins, mods, ops } = req.body;

    if (!version || !type) {
        return res.status(400).json({ error: 'Missing required parameters: version, type' });
    }

    try {
        // Check capacity
        const containers = await docker.listContainers({
            all: true,
            filters: { ancestor: ['itzg/minecraft-server'] }
        });

        if (containers.length >= MAX_SERVERS) {
            return res.status(503).json({ error: 'La capacidad del servidor esta llena lo siento' });
        }

        const containerName = name || `mc-server-${Date.now()}`;
        const image = 'itzg/minecraft-server';

        // Resolve Plugins/Mods
        let envVars = [
            'EULA=TRUE',
            `VERSION=${version}`,
            `TYPE=${type}`
        ];

        if (ops && ops.length > 0) {
            envVars.push(`OPS=${ops.join(',')}`);
        }

        if (plugins && plugins.length > 0 && (type === 'SPIGOT' || type === 'PAPER')) {
            console.log('Resolving plugins...');
            const pluginUrls = [];
            for (const pluginName of plugins) {
                const url = await resolvePlugin(pluginName);
                if (url) pluginUrls.push(url);
            }
            if (pluginUrls.length > 0) {
                envVars.push(`PLUGINS=${pluginUrls.join(',')}`);
            }
        }

        if (mods && mods.length > 0 && (type === 'FORGE' || type === 'FABRIC')) {
            console.log('Resolving mods...');
            const modUrls = [];
            // Map TYPE to Modrinth loader name
            const loader = type === 'FORGE' ? 'forge' : 'fabric';

            for (const modName of mods) {
                const url = await resolveMod(modName, version, loader);
                if (url) modUrls.push(url);
            }
            if (modUrls.length > 0) {
                envVars.push(`MODS=${modUrls.join(',')}`);
            }
        }

        // Check if image exists locally, if not pull it
        const images = await docker.listImages();
        const imageExists = images.some(img => img.RepoTags && img.RepoTags.includes(image + ':latest'));

        if (!imageExists) {
            console.log(`Pulling image ${image}...`);
            await new Promise((resolve, reject) => {
                docker.pull(image, (err, stream) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, onFinished, onProgress);
                    function onFinished(err, output) {
                        if (err) return reject(err);
                        resolve(output);
                    }
                    function onProgress(event) { }
                });
            });
            console.log(`Image pulled.`);
        }

        const container = await docker.createContainer({
            Image: image,
            name: containerName,
            Env: envVars,
            HostConfig: {
                PublishAllPorts: true // Let Docker assign a random host port
            },
            ExposedPorts: {
                '25565/tcp': {}
            }
        });

        await container.start();
        const data = await container.inspect();
        const portBindings = data.NetworkSettings.Ports['25565/tcp'];
        const publicPort = portBindings ? portBindings[0].HostPort : null;

        res.json({
            message: 'Server created successfully',
            id: container.id,
            name: containerName,
            connection: {
                host: 'localhost',
                port: publicPort
            },
            plugins: plugins || [],
            mods: mods || []
        });

    } catch (error) {
        console.error('Error creating container:', error);
        res.status(500).json({ error: 'Failed to create server', details: error.message });
    }
});

// DELETE SERVER
app.delete('/servers/:id', async (req, res) => {
    try {
        const container = docker.getContainer(req.params.id);
        const data = await container.inspect();

        if (data.State.Running) {
            await container.stop();
        }
        await container.remove();

        res.json({ message: 'Server deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// START SERVER
app.post('/servers/:id/start', async (req, res) => {
    try {
        const container = docker.getContainer(req.params.id);
        await container.start();
        res.json({ message: 'Server started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STOP SERVER
app.post('/servers/:id/stop', async (req, res) => {
    try {
        const container = docker.getContainer(req.params.id);
        await container.stop();
        res.json({ message: 'Server stopped' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Minecraft API listening at http://localhost:${port}`);
});

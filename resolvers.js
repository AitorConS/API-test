const axios = require('axios');

async function resolvePlugin(name) {
    try {
        // Search for the resource
        const searchUrl = `https://api.spiget.org/v2/search/resources/${encodeURIComponent(name)}?size=1`;
        const searchResponse = await axios.get(searchUrl);

        if (!searchResponse.data || searchResponse.data.length === 0) {
            console.warn(`Plugin not found: ${name}`);
            return null;
        }

        const resourceId = searchResponse.data[0].id;
        // Construct download URL (Spiget provides a direct download endpoint)
        // Note: Some resources are external and cannot be downloaded via API. 
        // We will assume they are hosted on SpigotMC for now.
        return `https://api.spiget.org/v2/resources/${resourceId}/download`;
    } catch (error) {
        console.error(`Error resolving plugin ${name}:`, error.message);
        return null;
    }
}

async function resolveMod(name, version, loader) {
    try {
        // Search for the project
        const searchUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(name)}&facets=[["project_type:mod"]]`;
        const searchResponse = await axios.get(searchUrl);

        if (!searchResponse.data.hits || searchResponse.data.hits.length === 0) {
            console.warn(`Mod not found: ${name}`);
            return null;
        }

        const projectId = searchResponse.data.hits[0].project_id;

        // Get versions filtered by loader and game version
        // Loaders and game_versions must be JSON arrays in the query param
        const loadersParam = JSON.stringify([loader.toLowerCase()]);
        const versionsParam = JSON.stringify([version]);

        const versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version?loaders=${encodeURIComponent(loadersParam)}&game_versions=${encodeURIComponent(versionsParam)}`;
        const versionsResponse = await axios.get(versionsUrl);

        if (!versionsResponse.data || versionsResponse.data.length === 0) {
            console.warn(`No compatible version found for mod ${name} (Loader: ${loader}, Version: ${version})`);
            return null;
        }

        // Get the first file of the first (latest) version
        const files = versionsResponse.data[0].files;
        if (!files || files.length === 0) {
            return null;
        }

        return files[0].url;

    } catch (error) {
        console.error(`Error resolving mod ${name}:`, error.message);
        return null;
    }
}

module.exports = { resolvePlugin, resolveMod };

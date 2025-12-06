# Minecraft Docker API

API REST para crear y gestionar servidores de Minecraft utilizando Docker.

## Requisitos

- Node.js
- Docker (debe estar ejecutándose)

## Instalación

1. Clonar el repositorio o descargar los archivos.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor:
   ```bash
   npm start
   ```
   El servidor escuchará en `http://localhost:3000`.

## Endpoints

### 1. Listar Servidores
Obtiene una lista de todos los contenedores de servidores de Minecraft.

- **URL**: `/servers`
- **Método**: `GET`
- **Respuesta Exitosa**:
  ```json
  [
    {
      "id": "...",
      "name": "mc-server",
      "image": "itzg/minecraft-server",
      "state": "running",
      "status": "Up 5 minutes",
      "connection": {
        "host": "localhost",
        "port": 32768
      }
    }
  ]
  ```

### 2. Obtener Servidor
Obtiene detalles de un servidor específico.

- **URL**: `/servers/:id`
- **Método**: `GET`
- **Parámetros URL**: `id` (ID del contenedor)
- **Respuesta Exitosa**:
  ```json
  {
    "id": "...",
    "name": "mc-server",
    "state": "running",
    "connection": {
      "host": "localhost",
      "port": 32768
    },
    "env": [...]
  }
  ```

### 3. Crear Servidor
Crea e inicia un nuevo contenedor de servidor de Minecraft.

- **URL**: `/servers`
- **Método**: `POST`
- **Cuerpo (JSON)**:
  - `version` (Requerido): Versión de Minecraft (ej. "1.20.1").
  - `type` (Requerido): Tipo de servidor (ej. "SPIGOT", "VANILLA", "FORGE", "PAPER", "FABRIC").
  - `name` (Opcional): Nombre del contenedor.
  - `plugins` (Opcional, solo SPIGOT/PAPER): Lista de nombres de plugins a instalar desde Spiget (ej. `["EssentialsX"]`).
  - `mods` (Opcional, solo FORGE/FABRIC): Lista de nombres de mods a instalar desde Modrinth (ej. `["Jei"]`).
  - `ops` (Opcional): Lista de usuarios a los que dar OP (ej. `["Usuario1", "Usuario2"]`).
- **Ejemplo**:
  ```json
  {
    "version": "1.20.1",
    "type": "SPIGOT",
    "name": "mi-servidor",
    "plugins": ["EssentialsX"],
    "ops": ["AdminUser"]
  }
  ```
- **Respuesta Exitosa**:
  ```json
  {
    "message": "Server created successfully",
    "id": "...",
    "name": "mi-servidor",
    "connection": {
      "host": "localhost",
      "port": 32768
    }
  }
  ```

### 4. Eliminar Servidor
Detiene y elimina un servidor.

- **URL**: `/servers/:id`
- **Método**: `DELETE`
- **Respuesta Exitosa**:
  ```json
  { "message": "Server deleted successfully" }
  ```

### 5. Detener Servidor
Detiene un servidor en ejecución.

- **URL**: `/servers/:id/stop`
- **Método**: `POST`
- **Respuesta Exitosa**:
  ```json
  { "message": "Server stopped" }
  ```

### 6. Iniciar Servidor
Inicia un servidor detenido.

- **URL**: `/servers/:id/start`
- **Método**: `POST`
- **Respuesta Exitosa**:
  ```json
  { "message": "Server started" }
  ```

const config = {
    name: 'data-sync-plugin',
    title: 'Data Sync Plugin',
    description: 'A plugin for youth Lookups in the Capture app',
    type: 'app',
    entryPoints: {
        app: './src/Plugin.tsx',   // Add this to fix the routing error
        plugin: './src/Plugin.tsx'
    },
}

module.exports = config

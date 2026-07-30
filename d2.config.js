const config = {
    name: 'civil-registry-plugin',
    title: 'Civil Registry Plugin',
    description: 'A  plugin for doing Civil Registry Lookups in the Capture app',
    type: 'app',
    entryPoints: {
        app: './src/Plugin.tsx',   // Add this to fix the routing error
        plugin: './src/Plugin.tsx'
    },
}

module.exports = config

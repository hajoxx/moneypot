({
    baseUrl: 'scripts',
    out: '../build2/main-built.js',
    preserveLicenseComments: false,
    name: 'lib/almond',
    mainConfigFile: 'scripts/main.js',
    include: 'main',
    insertRequire: ['main']
})
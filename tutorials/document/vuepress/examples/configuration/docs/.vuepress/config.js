module.exports = {
  title: 'VuePressConfiguration',
  description: 'VuePress\' configuration',
  themeConfig: {
    logo: '/assets/images/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Sidebar', link: '/sidebar/' },
      { text: 'External', link: 'https://google.com' }
    ],
    displayAllHeaders: true,
    sidebar: {
      '/sidebar/': [
        'one',
        'two',
        ['three', 'Three 3'],
        {
          title: '456',   // 必要的
          collapsable: false, // 可选的, 默认值是 true,
          sidebarDepth: 1,    // 可选的, 默认值是 1
          children: [
            'four',
            'five',
            'six'
          ]
        },
      ]
    }
  }
}

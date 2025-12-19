tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#8B4513',     // 木质棕色
        secondary: '#D2B48C',   // 浅棕色
        accent: '#FF6B35',      // 强调色-橙色
        board: '#DEB887',       // 棋盘底色
        black: '#111111',       // 黑子颜色
        white: '#F8F8F8',       // 白子颜色
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'piece': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'piece-active': '0 0 15px 2px rgba(255, 107, 53, 0.6)',
      }
    },
  }
}
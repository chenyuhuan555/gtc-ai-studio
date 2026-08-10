/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gtc: {
          blue: '#1E6FFF',
          light: '#5BA3FF',
          ink: '#111827',
          sub: '#667085',
          bg: '#F7F8FC',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
          '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif',
        ],
      },
      borderRadius: {
        card: '24px',
      },
      boxShadow: {
        card: '0 10px 40px rgba(0,0,0,0.03)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.06)',
        soft: '0 8px 30px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}

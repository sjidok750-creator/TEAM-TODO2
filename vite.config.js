import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TEAM-TODO2/',
  plugins: [react()],
  build: {
    rollupOptions: {
      // 두 진입점: 메인 앱(index.html)과 홈 화면 아이콘용 달력(calendar.html)
      input: {
        main: 'index.html',
        calendar: 'calendar.html',
      },
    },
  },
})

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				// 淡蓝色主题色系
				primary: {
					50: '#E6F3FF',
					100: '#CCE7FF',
					200: '#99CFFF',
					300: '#66B7FF',
					400: '#339FFF',
					500: '#0087FF', // 主色
					600: '#006CD9',
					700: '#0051B3',
					800: '#00368C',
					900: '#001B66',
				},
				secondary: {
					50: '#F0F9FF',
					100: '#E0F2FE',
					200: '#BAE6FD',
					300: '#7DD3FC',
					400: '#38BDF8',
					500: '#0EA5E9',
					600: '#0284C7',
					700: '#0369A1',
					800: '#075985',
					900: '#0C4A6E',
				},
				neutral: {
					50: '#F8FAFC',
					100: '#F1F5F9',
					200: '#E2E8F0',
					300: '#CBD5E1',
					400: '#94A3B8',
					500: '#64748B',
					600: '#475569',
					700: '#334155',
					800: '#1E293B',
					900: '#0F172A',
				},
				success: {
					DEFAULT: '#10B981',
					light: '#D1FAE5',
				},
				warning: {
					DEFAULT: '#F59E0B',
					light: '#FEF3C7',
				},
				danger: {
					DEFAULT: '#EF4444',
					light: '#FEE2E2',
				},
				info: {
					DEFAULT: '#3B82F6',
					light: '#DBEAFE',
				},
			},
			borderRadius: {
				lg: '12px',
				md: '8px',
				sm: '4px',
			},
			boxShadow: {
				'soft': '0 2px 8px rgba(0, 135, 255, 0.1)',
				'medium': '0 4px 16px rgba(0, 135, 255, 0.15)',
				'large': '0 8px 24px rgba(0, 135, 255, 0.2)',
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'slide-in': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' },
				},
			},
			animation: {
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}

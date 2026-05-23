/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f2f4f8',
                    100: '#e6eaf2',
                    200: '#cfd6e5',
                    300: '#aeb9d0',
                    400: '#7d8dad',
                    500: '#576A8F',
                    600: '#4a5c7a',
                    700: '#3f4e68',
                    800: '#374256',
                    900: '#2f3848',
                },
            },
        },
    },
    plugins: [],
}
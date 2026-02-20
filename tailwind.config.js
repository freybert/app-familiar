/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#4ce68a", // Default from Family Management, will reconcile with Tasks Dashboard
                "background-light": "#f6f8f7",
                "background-dark": "#112118",
                // Additional colors from Tasks Dashboard
                "tasks-primary": "#308ce8",
                "tasks-bg-light": "#f6f7f8",
                "tasks-bg-dark": "#111921",
                "pastel-blue": "#e0f2fe",
                "pastel-green": "#f0fdf4",
                "pastel-purple": "#f5f3ff",
                "pastel-orange": "#fff7ed",
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"],
                "inter": ["Inter", "sans-serif"],
            },
            borderRadius: {
                "lg": "1rem",
                "xl": "1.5rem",
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
}

export const getTotalSaleSVGBase64 = (fillColor) => {
  const svg = `
      <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V8L16 3ZM7 7H12V9H7V7ZM17 17H7V15H17V17ZM17 13H7V11H17V13ZM15 9V5L19 9H15Z"
        fill="${fillColor}"
      />
    </svg>
    `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

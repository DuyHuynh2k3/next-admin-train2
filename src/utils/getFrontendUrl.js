//src/utils
export const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || "http://localhost:3001";
};

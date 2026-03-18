const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;


// Generic app params logic (replace with your own as needed)
const getAppParams = () => {
  return {
    appId: import.meta.env.VITE_APP_ID,
    token: null,
    fromUrl: window.location.href,
    functionsVersion: import.meta.env.VITE_FUNCTIONS_VERSION,
    appBaseUrl: import.meta.env.VITE_APP_BASE_URL,
  };
};

export { getAppParams };


export const appParams = {
	...getAppParams()
}

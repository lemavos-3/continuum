const buildLocalVersion = (): string => {
  const utc = new Date();
  const dateString = `${utc.getUTCFullYear()}.${String(utc.getUTCMonth() + 1).padStart(2, "0")}.${String(utc.getUTCDate()).padStart(2, "0")}`;
  return `v${dateString}-1`;
};

const rawVersion = import.meta.env.VITE_BUILD_VERSION;

const version = typeof rawVersion === "string" && rawVersion.trim()
  ? rawVersion.trim()
  : buildLocalVersion();

export { version };

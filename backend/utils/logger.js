const stamp = () => new Date().toISOString();
export const logger = {
    info: (...a) => console.log(stamp(), '[info]', ...a),
    warn: (...a) => console.warn(stamp(), '[warn]', ...a),
    error: (...a) => console.error(stamp(), '[error]', ...a)
};

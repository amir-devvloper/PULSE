export const ok = (res, body = {}, status = 200) => res.status(status).json({ success: true, ...body });
export const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

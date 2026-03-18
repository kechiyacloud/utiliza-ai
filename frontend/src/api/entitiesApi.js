import api from "./axios";

// ─── Clients ───────────────────────────────────────────
export const fetchSimpleClients = async () => {
    const res = await api.get("/clients/simple");
    return Array.isArray(res.data) ? res.data : [];
};

export const createSimpleClient = async (name) => {
    const res = await api.post("/clients/simple", { name });
    return res.data;
};

export const updateSimpleClient = async (id, name) => {
    const res = await api.put(`/clients/simple/${id}`, { name });
    return res.data;
};

export const deleteSimpleClient = async (id) => {
    const res = await api.delete(`/clients/simple/${id}`);
    return res.data;
};

// ─── Partner Clients ───────────────────────────────────
export const fetchPartnerClients = async () => {
    const res = await api.get("/partner-clients");
    return Array.isArray(res.data) ? res.data : [];
};

export const createPartnerClient = async (name) => {
    const res = await api.post("/partner-clients", { name });
    return res.data;
};

export const updatePartnerClient = async (id, name) => {
    const res = await api.put(`/partner-clients/${id}`, { name });
    return res.data;
};

export const deletePartnerClient = async (id) => {
    const res = await api.delete(`/partner-clients/${id}`);
    return res.data;
};

// ─── Partners (legacy, kept for backward compat) ──────
export const fetchPartners = async () => {
    const res = await api.get("/clients/partners");
    return Array.isArray(res.data) ? res.data : [];
};

export const createPartner = async (name) => {
    const res = await api.post("/clients/partners", { name });
    return res.data;
};

export const updatePartner = async (id, name) => {
    const res = await api.put(`/clients/partners/${id}`, { name });
    return res.data;
};

export const deletePartner = async (id) => {
    const res = await api.delete(`/clients/partners/${id}`);
    return res.data;
};

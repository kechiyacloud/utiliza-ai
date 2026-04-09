import api from "./axios";

// ??? Clients ????????????????????????????????????????????????????????????????
export const fetchSimpleClients = async () => {
    const res = await api.get("/clients/simple");
    return Array.isArray(res.data) ? res.data : [];
};

export const fetchClientsByPartner = async (partnerId) => {
    if (!partnerId) return [];
    const res = await api.get("/clients", { params: { partner_id: partnerId } });
    return Array.isArray(res.data) ? res.data : [];
};

export const fetchAutocompleteClients = async (search = "") => {
    const params = search ? { search } : undefined;
    const res = await api.get("/api/clients", { params });
    return Array.isArray(res.data) ? res.data : [];
};

export const createSimpleClient = async (name) => {
    const res = await api.post("/clients/simple", { name });
    return res.data;
};

export const createClientForPartner = async (name, partnerId) => {
    const res = await api.post("/clients/simple", { name, partner_id: partnerId });
    return res.data;
};

export const createFullClient = async (clientData) => {
    const res = await api.post("/clients", clientData);
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

// ??? Partners ????????????????????????????????????????????????????????????????
export const fetchPartnerClients = async () => {
    const res = await api.get("/partners");
    return Array.isArray(res.data) ? res.data : [];
};

export const createPartnerClient = async (name) => {
    const res = await api.post("/partners", { name });
    return res.data;
};

export const updatePartnerClient = async (id, name) => {
    const res = await api.put(`/partners/${id}`, { name });
    return res.data;
};

export const deletePartnerClient = async (id) => {
    const res = await api.delete(`/partners/${id}`);
    return res.data;
};

// Legacy aliases retained for compatibility
export const fetchPartners = fetchPartnerClients;
export const createPartner = createPartnerClient;
export const updatePartner = updatePartnerClient;
export const deletePartner = deletePartnerClient;

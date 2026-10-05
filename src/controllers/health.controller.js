export const healthCheck = (req, res) => {
    return res.status(200).json({
        status: "OK",
        message: "Server is healthy",
    });
};

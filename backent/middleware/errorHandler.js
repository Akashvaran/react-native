const errorHandler = (err, req, res, next) => {
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map((el) => el.message);
        return res.status(400).json({ message: "Validation failed", errors });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            message: "Invalid ID format",
            error: `Invalid ${err.path}: ${err.value}`,
        });
    }

    if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern)[0];
        const duplicateValue = err.keyValue[duplicateField];

        return res.status(400).json({
            message: `Duplicate field value: ${duplicateValue}. Choose another ${duplicateField}.`,
        });
    }

    res.status(500).json({ message: "Internal server error", error: err.message });
};

module.exports = errorHandler;

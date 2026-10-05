import userService from "../services/user.service.js";

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await userService.findUser({
            $or: [{ username }, { email }],
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email already exists",
            });
        }

        const user = await userService.createUser({
            username,
            email,
            password,
        });

        return res.status(201).json({
            message: "User created successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userService.findUser({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const isPasswordCorrect = await user.isPasswordCorrect(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const accessToken = user.generateAccessToken();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
            accessToken,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

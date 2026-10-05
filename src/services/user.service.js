import { User } from "../models/user.model.js";

class UserService {
    async findUser(filter) {
        return await User.findOne(filter).select("+password");
    }

    async findUserById(id) {
        return await User.findById(id);
    }

    async createUser(userData) {
        return await User.create(userData);
    }
}

const userService = new UserService();

export default userService;

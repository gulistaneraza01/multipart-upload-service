import * as userService from '../services/user.service.js';

// Controllers stay thin: parse request -> call service -> format response.

export const register = async (req, res) => {
  const result = await userService.registerUser(req.body);
  res.status(201).json({ success: true, data: result });
};

export const login = async (req, res) => {
  const result = await userService.loginUser(req.body);
  res.status(200).json({ success: true, data: result });
};

export const getMe = async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.status(200).json({ success: true, data: user });
};

export const getAll = async (req, res) => {
  const users = await userService.getAllUsers();
  res.status(200).json({ success: true, data: users });
};

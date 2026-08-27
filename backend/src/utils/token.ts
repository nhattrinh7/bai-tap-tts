// Tạo share_token là 1 chuỗi ngẫu nhiên dài 7 kí tự bao gồm cả số và chữ, vd: x2k9a3p
export const generateToken = () => Math.random().toString(36).substring(2, 9)

export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  }
}

export function errorResponse(message: string) {
  return {
    success: false,
    error: message,
  }
}

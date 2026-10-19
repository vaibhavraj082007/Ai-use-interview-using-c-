export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }
}

export const httpError = {
  badRequest: (message = 'Bad request.') => new HttpError(400, message),
  unauthorized: (message = 'Not authenticated.') => new HttpError(401, message),
  forbidden: (message = 'Forbidden.') => new HttpError(403, message),
  notFound: (message = 'Not found.') => new HttpError(404, message),
  conflict: (message = 'Conflict.') => new HttpError(409, message),
  internal: (message = 'Something went wrong.') => new HttpError(500, message),
}

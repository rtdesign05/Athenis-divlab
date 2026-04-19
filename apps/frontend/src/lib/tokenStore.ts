/** In-memory token store — survives re-renders but not page refresh (by design). */
let _token: string | null = null

export const tokenStore = {
  get: () => _token,
  set: (token: string | null) => {
    _token = token
  },
}

declare global {
  /**
   * Event definitions can be extended by
   *
   * @example
   *
   * declare global {
   *   interface Events {
   *     'user.subscription.created': {
   *       userId: User['id'];
   *     }
   *   }
   * }
   */
  interface Events {}
}

export type EventName = keyof Events;

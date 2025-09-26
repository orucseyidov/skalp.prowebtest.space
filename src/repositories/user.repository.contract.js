/**
 * @typedef {Object} Pagination
 * @property {number} page
 * @property {number} limit
 */

/**
 * @typedef {Object} User
 * @property {string|number} id
 * @property {string} name
 * @property {string} email
 * @property {string} createdAt
 */

/**
 * @interface UserRepository
 * @property {(p:Pagination)=>Promise<{items:User[], total:number, page:number, limit:number}>} findAll
 * @property {(id:string|number)=>Promise<User|null>} findById
 * @property {(data:Partial<User>)=>Promise<User>} create
 * @property {(id:string|number, data:Partial<User>)=>Promise<User>} update
 * @property {(id:string|number)=>Promise<void>} remove
 */

module.exports = {};


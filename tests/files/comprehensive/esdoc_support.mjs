/**
 * My function
 * @param {string} alpha
 * @param {object} beta
 * @param {number} beta.num
 * @param {object}          beta.obj
 * @param {number{1,100}}   beta.obj.num
 * @param {number{1.1,2.1}} beta.obj.float
 * @param {string{2..7}}    beta.obj.str
 * @param {array<array<number{20,30}>>} gamma
 * @returns {object} response
 */
export default async (alpha, beta, gamma) => {
  
  return {
    alpha,
    beta,
    gamma
  };

}
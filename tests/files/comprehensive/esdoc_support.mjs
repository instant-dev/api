/**
 * My function
 * @param {string} alpha
 * @param {object} beta
 * @param {number} beta.num
 * @param {object}          beta.obj
 * @param {number{1,100}}   beta.obj.num
 * @param {number{1.1,2.1}} beta.obj.float
 * @param {string{2..7}}    beta.obj.str
 * @param {array<array<number{20,30}>>{1..3}} gamma
 * @param {boolean|string} boolstring
 * @param {array{5}|"jazzhands"|5.9|boolean} mystery
 * @param {number|"hello"|"goodbye"} hg
 * @returns {object} response
 */
export default async (alpha, beta, gamma, boolstring, mystery, hg = 5.2) => {
  
  return {
    alpha,
    beta,
    gamma,
    boolstring,
    mystery,
    hg
  };

}
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
 * @param {string[]} a1
 * @param {buffer[5][2..7]} a2
 * @returns {object} response
 * @returns {number} response.a
 * @returns {object} response.b
 * @returns {string} response.b.c
 */
export default async (alpha, beta, gamma, boolstring, mystery, hg = 5.2, a1, a2) => {
  
  return {
    alpha,
    beta,
    gamma,
    boolstring,
    mystery,
    hg,
    a1,
    a2
  };

}
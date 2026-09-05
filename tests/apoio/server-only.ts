/**
 * Substituto do pacote `server-only` durante os testes unitários.
 *
 * O pacote real tem um `export` que só existe na condição "react-server" e
 * lança em qualquer outro ambiente. Ele existe para o bundler do Next avisar
 * quando um módulo de servidor vaza para o cliente — informação inútil aqui,
 * onde só exercitamos a lógica em Node. O apelido está em vitest.config.ts.
 */
export {};

/**
 * Created by Patrick on 03/05/2017.
 */
var Messages = {
    success: {
        CREATED_SUCCESS: "O objeto foi criado com sucesso",
        DOWNLOAD_SUCCESS: "Download realizado com sucesso",
        DELETED_SUCCESS: "O objeto foi removido com sucesso",
        EDITED_SUCCESS: "O objeto foi atualizado com sucesso",
        RECOVER_EMAIL_SUCCESS: "Siga os passos enviados ao seu e-mail para redefinir sua senha",
        NOT_FOUND_ANALYZE: "O Jogador não possui avaliações no período selecionado.",
    },
    push: {
    },
    error: {
        ERROR_UNAUTHORIZED: { code: 401, message: "Voce não possui autorização para realizar esta ação."},
        INVALID_USERNAME: { code: 101, message:"Nome de usuário ou senha incorretos, tente novamente."},
        ERROR_ACCESS_REQUIRED: { code: 401, message:"Voce não possui privilégio para realizar esta ação."},
        ERROR_EMAIL_NOT_FOUND: { code: 101, message:"Email não encotrado."},
        ERROR_INVALID_USER_GROUP: {code: 101,message: "Grupo de usuários não encontrado."},
        ERROR_LICENSES_UNAUTHORIZED: {code:101, message: "Agência ultrapassou o número de licenças permitidas."},
        INVALID_EMAIL: {code: 101, message: "Usuário já cadastrado com este email."},

    }
};

module.exports = Messages;
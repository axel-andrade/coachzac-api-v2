// In a node.js environment
var Parse = require('parse/node');

Parse.initialize("coachzacId");
//Parse.serverURL = "https://coachzac-v2-api.herokuapp.com/use";
Parse.serverURL = "http:localhost:1982/use";

let Fundament = new Parse.Object.extend("Fundament");
let fundament = new Fundament();
fundament.id = "l8UsH10k2Y";

let steps = [];

steps.push({
    name: "Posicionamento dos pés ",
    code: "foot-position",
    number: 1,
    difficulty: 1,
    description: "Os pés devem está posicionados a cerca de 5 centímetros atrás da linha de fundo.  As pontas dos pés devem formar uma linha paralela com a direção que deseja lançar a bola.",
});

steps.push({
    name: "Posição inicial dos braços e das mãos ",
    code: "initial-arm",
    number: 2,
    difficulty: 1,
    description: "A mão direita segura o cabo da raquete e os braços ficam para frente, bem relaxados. O jogador poderá apoiar a bola na palma da mão esquerda e segurá-la com três dedos.",

});

steps.push({
    name: "Braço direito sobe antes do esquerdo ",
    code: "right-before",
    number: 3,
    difficulty: 2,
    description: "O braço direito realiza um movimento mais longo em relação ao braço esquerdo. A velocidade dos braços tem que ser diferentes, para que haja uma sincronia entre a raquete e a bola chegando ao ponto de impacto.",

});

steps.push({
    name: "Elevação da Bola",
    code: "ball-elevation",
    number: 4,
    difficulty: 3,
    description: "É um dos passos mais importantes do saque e também uns dos mais difíceis, pois requer um total relaxamento e uma percepção de que a bola não deve ser jogada e, sim, colocada no lugar certo."
});

steps.push({
    name: "Altura da Bola",
    code: "ball-height",
    number: 5,
    difficulty: 3,
    description: "A bola deve atingir o ponto onde a soma da extensão do braço e da raquete seja máxima. A bola não deve ser elevada acima desse ponto, para que o jogador não seja obrigado a esperar a bola cair para atingi-la. Por outro lado, se a bola for elevada muito abaixo do ponto correto, a raquete ainda não estará na altura correta para a batida.",
});

steps.push({
    name: "Braço esquerdo estendido ",
    code: "left-extended",
    number: 6,
    difficulty: 3,
    description: "Depois de elevar a bola ao ponto devido, o jogador deve manter o braço esquerdo estendido por alguns centésimos de segundo, quase até o momento em que a raquete atinja a bola. Ao abaixar o braço prematuramente, o corpo se desequilibra, prejudicando a fluidez do movimento.",

});

steps.push({
    name: "Posição e movimentação dos pés ",
    code: "foot-movement",
    number: 7,
    difficulty: 3,
    description: "A posição inicial dos pés pode sofrer modificações à medida que o jogador for adquirindo maior confiança no saque. Essas alterações podem produzir saques ainda mais fortes, pois promovem um maior giro do corpo e um efeito de mola no momento do impacto.",

});

steps.push({
    name: "Flexionamento dos joelhos ",
    code: "knee-flexion",
    number: 8,
    difficulty: 2,
    description: "O momento correto para o flexionamento dos joelhos é quando a raquete está apontada para cima antes de cair para trás das costas, ao mesmo tempo em que a bola está sendo elevada ao ponto de contato. Com flexionamento de joelhos correto a velocidade do braço aumenta consideravelmente, promovendo um aumento significativo na potência do saque.",
});

for (let i = 0; i < steps.length; i++) {

    let Step = Parse.Object.extend("Step");
    let step = new Step();

    step.set("name", steps[i].name);
    step.set("code", steps[i].code);
    step.set("number", steps[i].number);
    step.set("difficulty", steps[i].difficulty);
    step.set("description", steps[i].description);
    step.set("fundament", fundament);
    step.set("isBlocked", false);

    step.save().then(function(){

    }, function(error){
        console.log(error.code,error.message)
    });

    console.log("ENtrou")
}





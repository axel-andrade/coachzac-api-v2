
const define = {
    //constants
    coachPermissions: ["createCoach","createPlayer", "editEmployee", "deleteEmployee", "createHome", "editHome", "activateHome", "deleteHome", "createProposal", "editProposal", "deleteProposal", "viewProposal"],
    initialCoachPermissions: ["createHome", "editHome", "activateHome", "deleteHome", "createProposal", "editProposal", "deleteProposal", "viewProposal"],
    coachzacPermissions: [],
    userGroups: ["admin", "coach", "player"],
    initialSteps: ["foot-position", "initial-arm","right-before","ball-elevation","ball-height","left-extended","foot-movement","knee-flexion"],


    // classes
    Analyze: Parse.Object.extend("Analyze"),
    Fundament: Parse.Object.extend("Fundament"),
    Step: Parse.Object.extend("Step"),

};
module.exports = define;
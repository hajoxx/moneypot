define([
    'strategies/auto_bet/widget',
    'strategies/auto_bet/logic',
    'strategies/auto_bet/validation',
    'strategies/auto_bet/initial_state'
], function(
    Widget,
    Logic,
    Validation,
    InitialState)
{
    var AutoBet = Widget;
        AutoBet.logic = Logic;
        AutoBet.validate = Validation;
        AutoBet.initialState = InitialState;
        AutoBet.isWidget = true;

    return AutoBet;
});
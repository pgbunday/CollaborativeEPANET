import Project from '../Project';
import { RuleStatus, RuleObject, RuleVariable, RuleOperator } from '../../index';
declare class RuleBasedControlFunctions {
    addRule(this: Project, rule: string): void;
    deleteRule(this: Project, index: number): void;
    getRule(this: Project, index: number): {
        premiseCount: number;
        thenActionCount: number;
        elseActionCount: number;
        priority: number;
    };
    getRuleId(this: Project, index: number): string;
    getPremise(this: Project, ruleIndex: number, premiseIndex: number): {
        logop: number;
        object: RuleObject;
        objIndex: number;
        variable: RuleVariable;
        relop: RuleOperator;
        status: RuleStatus;
        value: number;
    };
    setPremise(this: Project, ruleIndex: number, premiseIndex: number, logop: number, object: RuleObject, objIndex: number, variable: RuleVariable, relop: RuleOperator, status: RuleStatus, value: number): void;
    setPremiseIndex(this: Project, ruleIndex: number, premiseIndex: number, objIndex: number): void;
    setPremiseStatus(this: Project, ruleIndex: number, premiseIndex: number, status: RuleStatus): void;
    setPremiseValue(this: Project, ruleIndex: number, premiseIndex: number, value: number): void;
    getThenAction(this: Project, ruleIndex: number, actionIndex: number): {
        linkIndex: number;
        status: RuleStatus;
        setting: number;
    };
    setThenAction(this: Project, ruleIndex: number, actionIndex: number, linkIndex: number, status: RuleStatus, setting: number): void;
    getElseAction(this: Project, ruleIndex: number, actionIndex: number): {
        linkIndex: number;
        status: RuleStatus;
        setting: number;
    };
    setElseAction(this: Project, ruleIndex: number, actionIndex: number, linkIndex: number, status: RuleStatus, setting: number): void;
    setRulePriority(this: Project, index: number, priority: number): void;
}
export default RuleBasedControlFunctions;
//# sourceMappingURL=RuleBasedControl.d.ts.map
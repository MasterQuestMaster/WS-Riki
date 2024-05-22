/**
 * Represents an AND/OR tree. 
 * If the type is "and", the members are TokenType[].
 * If the type is "or", the members are Array<TokenType|TokenType[]>.
 */
export type LogicTree<TokenType> = {
    type: "and"|"or",
    members: TokenType[]|Array<TokenType|TokenType[]>
}

/**
 * Represent an AND/OR structure. Split the members by calling "or()" between additions.
 */
export class LogicGroup<TokenType> {
    //Top Level OR, second level AND.
    private members: Array<TokenType|TokenType[]>;
    //The index of the currently used members entry.
    private memberIndex: number;

    constructor() {
        this.members = [];
        this.memberIndex = 0;
    }

    /**
     * Add a new member to the group. It will be "and" with all members added since the last "or".
     * @param token A token to be added as member.
     */
    addAnd(token: TokenType) {
        const activeMember = this.members[this.memberIndex];
        //Accumulate tokens in the same array slot.
        if(Array.isArray(activeMember)) {
            activeMember.push(token);
        }
        //create array when 2 members are reached
        else if(activeMember) {
            this.members[this.memberIndex] = [activeMember, token];
        }
        else {
            this.members.push(token);
        }
    }

    /**
     * Start a new branch for adding members. All new members will go to the new branch.
     */
    or() {
        //Only create a new path if the current path has entries.
        const activeMember = this.members[this.memberIndex];
        if((Array.isArray(activeMember) && activeMember.length == 0) || !activeMember) {
            return;
        }

        //This causes the next member to be added in a new slot.
        this.memberIndex++;
    }

    /**
     * Get the AND/OR tree. It's an "OrGroup" (an array of items that can be SearchToken or SearchToken[]).
     * The members are the items added with "addAnd".
     * @returns OrGroup (if nor OR was specified, the group only has 1 member.)
     */
    getTree(): LogicTree<TokenType>{
        if(this.members.length == 1) {
            //If there's only one member, return it as an "And Group".
            //Make sure that the value is always an array, even if there's only 1 and group member.
            const member = this.members[0];
            const memberArray = Array.isArray(member) ? member : [member];
            return {
                type: "and",
                members: memberArray
            }
        }
        else {
            //remove empty paths on top level.
            const populatedMembers = this.members.filter((m) => !Array.isArray(m) || m.length > 0);

            return {
                type: "or",
                members: populatedMembers
            }
        };
    }
}

export function negateLogicTree<TokenType>(tree: LogicTree<TokenType>, tokenNegator: (token: TokenType)=>void) {
    //after negating everything, we need to swap and/or to be consistent.
    tree.type = (tree.type == "and") ? "or" : "and";
    for(const member of tree.members) {
        if(Array.isArray(member)) {
            member.forEach(tokenNegator);
        }
        else {
            tokenNegator(member);
        }
    }
}
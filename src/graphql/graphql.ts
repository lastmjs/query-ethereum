import { GQLResult } from "../..";
import * as fetch from 'node-fetch';

export async function gqlRequest(query: string, variables?: {}): Promise<GQLResult> {
    const response = await fetch('http://localhost:8547/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    return await response.json();
}
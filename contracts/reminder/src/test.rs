#![cfg(test)]

use crate::types::EscrowParticipant;
use crate::{ReminderContract, ReminderContractClient};
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};

fn setup() -> (Env, ReminderContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, ReminderContract);
    let client = ReminderContractClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn test_request_and_cancel_reminder() {
    let (env, client) = setup();
    let split_id = String::from_str(&env, "split-1");
    let participant = Address::generate(&env);

    // Participant still owes money (paid 0 of 100).
    let participants = vec![&env, EscrowParticipant::new(participant.clone(), 100)];
    client.create_escrow(&split_id, &participants);

    // No reminder yet.
    assert!(!client.get_reminder_requested(&split_id, &participant));

    // Request a reminder -> flag flips on.
    client.request_reminder(&split_id, &participant);
    assert!(client.get_reminder_requested(&split_id, &participant));

    // Cancel the reminder -> flag flips off.
    client.cancel_reminder(&split_id, &participant);
    assert!(!client.get_reminder_requested(&split_id, &participant));
}

#[test]
fn test_no_reminder_for_fully_paid_participant() {
    let (env, client) = setup();
    let split_id = String::from_str(&env, "split-2");
    let participant = Address::generate(&env);

    // Participant has fully paid (100 of 100).
    let mut paid = EscrowParticipant::new(participant.clone(), 100);
    paid.amount_paid = 100;
    let participants = vec![&env, paid];
    client.create_escrow(&split_id, &participants);

    // request_reminder must not flag a participant who owes nothing.
    let result = client.try_request_reminder(&split_id, &participant);
    assert!(result.is_err());
    assert!(!client.get_reminder_requested(&split_id, &participant));
}

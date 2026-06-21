use crate::types::{DataKey, Escrow};
use soroban_sdk::{Env, String};

pub fn get_escrow(env: &Env, split_id: &String) -> Option<Escrow> {
    env.storage()
        .persistent()
        .get(&DataKey::Escrow(split_id.clone()))
}

pub fn set_escrow(env: &Env, split_id: &String, escrow: &Escrow) {
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(split_id.clone()), escrow);
}

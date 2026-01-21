use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

declare_id!("6U4BoX8jTdsJca3N6B1H42x4NkCeMVV667QkDBV8bdKq");

#[ephemeral]
#[program]
pub mod simcity_build {
    use super::*;

    /// Initialize a new city account
    pub fn initialize_city(ctx: Context<InitializeCity>) -> Result<()> {
        let city = &mut ctx.accounts.city;
        city.tiles = [[0; 16]; 16];
        city.population = 0;
        city.money = 10000; // Starting money
        city.last_updated = Clock::get()?.unix_timestamp;
        city.authority = ctx.accounts.authority.key();

        msg!("City initialized for authority: {}", city.authority);
        Ok(())
    }

    /// Place a building on the grid
    #[session_auth_or(
        ctx.accounts.city.authority.key() == ctx.accounts.signer.key(),
        CityError::InvalidAuth
    )]
    pub fn place_building(ctx: Context<UpdateCity>, x: u8, y: u8, building_type: u8) -> Result<()> {
        require!(x < 16 && y < 16, CityError::OutOfBounds);
        // Basic validation: 0=Empty, 1=Global, 2=Residential, 3=Commercial, 4=Industrial
        // Assuming > 0 is a building. 0 is bulldozing (use bulldoze instruction for clarity or allow here)
        require!(building_type > 0, CityError::InvalidBuildingType);

        let city = &mut ctx.accounts.city;
        city.tiles[y as usize][x as usize] = building_type;

        // Simple mechanic: Spend money
        // TODO: Make costs dynamic based on building type
        let cost = 100;
        if city.money >= cost {
            city.money -= cost;
        } else {
            return err!(CityError::NotEnoughMoney);
        }

        msg!("Placed building type {} at ({}, {})", building_type, x, y);
        Ok(())
    }

    /// Clear a tile
    #[session_auth_or(
        ctx.accounts.city.authority.key() == ctx.accounts.signer.key(),
        CityError::InvalidAuth
    )]
    pub fn bulldoze(ctx: Context<UpdateCity>, x: u8, y: u8) -> Result<()> {
        require!(x < 16 && y < 16, CityError::OutOfBounds);

        let city = &mut ctx.accounts.city;
        city.tiles[y as usize][x as usize] = 0; // 0 = Empty

        msg!("Bulldozed tile at ({}, {})", x, y);
        Ok(())
    }

    /// Simulate one step (can be called periodically)
    #[session_auth_or(
        ctx.accounts.city.authority.key() == ctx.accounts.signer.key(),
        CityError::InvalidAuth
    )]
    pub fn step_simulation(ctx: Context<UpdateCity>) -> Result<()> {
        let city = &mut ctx.accounts.city;
        let now = Clock::get()?.unix_timestamp;

        // Example logic: Grow population if there are residential tiles
        // In a real game, this would be more complex
        let mut residential_count = 0;
        for row in city.tiles.iter() {
            for &tile in row.iter() {
                if tile == 2 {
                    // Residential
                    residential_count += 1;
                }
            }
        }

        if residential_count > 0 {
            city.population += residential_count * 10;
        }

        city.last_updated = now;
        msg!("Simulation step complete. Population: {}", city.population);
        Ok(())
    }

    // ========================================
    // MagicBlock Ephemeral Rollups Functions
    // ========================================

    pub fn delegate(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[ctx.accounts.payer.key().as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn commit(ctx: Context<CommitInput>) -> Result<()> {
        commit_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.city.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }

    pub fn undelegate(ctx: Context<CommitInput>) -> Result<()> {
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.city.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }
}

// ========================================
// Account Structs
// ========================================

#[derive(Accounts)]
pub struct InitializeCity<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + City::INIT_SPACE,
        seeds = [authority.key().as_ref()],
        bump
    )]
    pub city: Account<'info, City>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts, Session)]
pub struct UpdateCity<'info> {
    #[account(
        mut,
        seeds = [city.authority.key().as_ref()],
        bump
    )]
    pub city: Account<'info, City>,

    #[account(mut)]
    pub signer: Signer<'info>,

    #[session(signer = signer, authority = city.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateInput<'info> {
    pub payer: Signer<'info>,
    /// CHECK: The PDA to delegate - validated by seeds constraint
    #[account(mut, del, seeds = [payer.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitInput<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [payer.key().as_ref()], bump)]
    pub city: Account<'info, City>,
}

// ========================================
// Account Data
// ========================================

#[account]
#[derive(InitSpace)]
pub struct City {
    pub tiles: [[u8; 16]; 16], // 16x16 grid = 256 bytes
    pub population: u32,
    pub money: u64,
    pub last_updated: i64,
    pub authority: Pubkey,
}

// ========================================
// Errors
// ========================================

#[error_code]
pub enum CityError {
    #[msg("Coordinates out of bounds")]
    OutOfBounds,
    #[msg("Invalid building type")]
    InvalidBuildingType,
    #[msg("Invalid authentication")]
    InvalidAuth,
    #[msg("Not enough money")]
    NotEnoughMoney,
}

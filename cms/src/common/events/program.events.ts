import { Program } from 'src/database/schema';

export class ProgramCreatedEvent {
  constructor(public readonly program: Program) {}
}

export class ProgramUpdatedEvent {
  constructor(public readonly program: Program) {}
}

export class ProgramDeletedEvent {
  constructor(public readonly programId: string) {}
}

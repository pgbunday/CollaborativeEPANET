// units.ts: A minimal MKS implementation for on-the-fly unit conversions

export interface Unit {
	value: number;
	meters?: number;
	seconds?: number;
	kilograms?: number;
}

export interface Length extends Unit {
	value: number;
	meters: 1;
	seconds?: 0;
	kilograms?: 0;
}

export interface Area extends Unit {
	value: number;
	meters: 2;
	seconds?: 0;
	kilograms?: 0;
}

export interface Volume extends Unit {
	value: number;
	meters: 3;
	seconds?: 0;
	kilograms?: 0;
}

export interface Time extends Unit {
	value: number;
	seconds: 1;
	meters?: 0;
	kilograms?: 0;
}

export interface Flow extends Unit {
	value: number;
	seconds: -1;
	meters: 3;
	kilograms?: 0;
}

export interface Pressure extends Unit {
	value: number;
	kilograms: 1;
	meters: -1;
	seconds: -2;
}

export interface Velocity extends Unit {
	value: number;
	kilograms?: 0;
	seconds: -1;
	meters: 1;
}

export function foot(amount: number): Length {
	const as_meters = (amount * 12 * 2.54) / 100;
	return {
		value: as_meters,
		meters: 1,
	};
}

export function meter(amount: number): Length {
	return {
		value: amount,
		meters: 1,
	};
}

export function inch(amount: number): Length {
	const as_meters = (amount * 2.54) / 100;
	return {
		value: as_meters,
		meters: 1,
	};
}

export function centimeter(amount: number): Length {
	const as_meters = amount / 100;
	return {
		value: as_meters,
		meters: 1,
	};
}

export function millimeter(amount: number): Length {
	const as_meters = amount / 1000;
	return { value: as_meters, meters: 1 };
}

export function liter(amount: number): Volume {
	const as_meters_cubed = (amount * 1000) / 100 / 100 / 100;
	return {
		value: as_meters_cubed,
		meters: 3,
	};
}

export function gallon(amount: number): Volume {
	const as_meters_cubed = (amount * 231 * 2.54 * 2.54 * 2.54) / 100 / 100 / 100;
	return {
		value: as_meters_cubed,
		meters: 3,
	};
}

export function imperial_gallon(amount: number): Volume {
	return liter(amount * 4.54609);
}

export function second(amount: number): Time {
	return {
		value: amount,
		seconds: 1,
	};
}

export function minute(amount: number): Time {
	const as_seconds = amount * 60;
	return {
		value: as_seconds,
		seconds: 1,
	};
}

export function hour(amount: number): Time {
	const as_seconds = amount * 60 * 60;
	return {
		value: as_seconds,
		seconds: 1,
	};
}

export function day(amount: number): Time {
	const as_seconds = amount * 60 * 60 * 24;
	return {
		value: as_seconds,
		seconds: 1,
	};
}

export function psi(amount: number): Pressure {
	const as_pascals = amount * 6894.757;
	return {
		value: as_pascals,
		kilograms: 1,
		meters: -1,
		seconds: -2,
	};
}

export function kpa(amount: number): Pressure {
	const as_pascals = amount * 1000;
	return {
		value: as_pascals,
		kilograms: 1,
		meters: -1,
		seconds: -2,
	};
}

export function pascal(amount: number): Pressure {
	return {
		value: amount,
		kilograms: 1,
		meters: -1,
		seconds: -2,
	};
}

export function meter_pressure_head(amount: number): Pressure {
	// https://en.wikipedia.org/wiki/Pressure_head
	// psi (height) = (fluid pressure p) / ((fluid density rho) * (acceleration due to gravity g))
	// So (fluid presure p) = psi * rho * g
	// Water density in kg / m^3 is approximately 997. Changes with temperature
	// g can vary slightly by location, but standard definition is 9.80665
	// In MKS, we end up with:
	const pa = amount * 997 * 9.80665;
	return pascal(pa);
}

export function divide(unit1: Unit, unit2: Unit): Unit {
	const value = unit1.value / unit2.value;
	let seconds: number | undefined;
	if (unit1.seconds && unit2.seconds) {
		seconds = unit1.seconds - unit2.seconds;
	} else if (unit1.seconds && !unit2.seconds) {
		seconds = unit1.seconds;
	} else if (!unit1.seconds && unit2.seconds) {
		seconds = -unit2.seconds;
	}

	let meters: number | undefined;
	if (unit1.meters && unit2.meters) {
		meters = unit1.meters - unit2.meters;
	} else if (unit1.meters && !unit2.meters) {
		meters = unit1.meters;
	} else if (!unit1.meters && unit2.meters) {
		meters = -unit2.meters;
	}

	let kilograms: number | undefined;
	if (unit1.kilograms && unit2.kilograms) {
		kilograms = unit1.kilograms - unit2.kilograms;
	} else if (unit1.kilograms && !unit2.kilograms) {
		kilograms = unit1.seconds;
	} else if (!unit1.kilograms && unit2.kilograms) {
		kilograms = -unit2.kilograms;
	}

	return {
		value,
		seconds,
		meters,
		kilograms,
	};
}

export function multiply(unit1: Unit, unit2: Unit): Unit {
	const value = unit1.value * unit2.value;
	let seconds: number | undefined;
	if (unit1.seconds && unit2.seconds) {
		seconds = unit1.seconds + unit2.seconds;
	} else if (unit1.seconds && !unit2.seconds) {
		seconds = unit1.seconds;
	} else if (!unit1.seconds && unit2.seconds) {
		seconds = unit2.seconds;
	}

	let meters: number | undefined;
	if (unit1.meters && unit2.meters) {
		meters = unit1.meters + unit2.meters;
	} else if (unit1.meters && !unit2.meters) {
		meters = unit1.meters;
	} else if (!unit1.meters && unit2.meters) {
		meters = unit2.meters;
	}

	let kilograms: number | undefined;
	if (unit1.kilograms && unit2.kilograms) {
		kilograms = unit1.kilograms + unit2.kilograms;
	} else if (unit1.kilograms && !unit2.kilograms) {
		kilograms = unit1.kilograms;
	} else if (!unit1.kilograms && unit2.kilograms) {
		kilograms = unit2.kilograms;
	}

	return {
		value,
		kilograms,
		meters,
		seconds,
	};
}

export function reciprocal(unit: Unit): Unit {
	const value = 1 / unit.value;
	let seconds: number | undefined;
	if (unit.seconds) {
		seconds = -unit.seconds;
	}
	let meters: number | undefined;
	if (unit.meters) {
		meters = -unit.meters;
	}
	let kilograms: number | undefined;
	if (unit.kilograms) {
		kilograms = -unit.kilograms;
	}
	return {
		value,
		kilograms,
		meters,
		seconds,
	};
}

export function gpm(amount: number): Flow {
	return divide(gallon(amount), minute(1)) as Flow;
}

export function lps(amount: number): Flow {
	return divide(liter(amount), second(1)) as Flow;
}

export function scale(unit: Unit, scalar: number) {
	return {
		...unit,
		value: unit.value * scalar,
	};
}

export function cfs(amount: number): Flow {
	const cubic_foot = multiply(foot(1), multiply(foot(1), foot(1)));
	const cubic_feet = scale(cubic_foot, amount);
	return divide(cubic_feet, second(1)) as Flow;
}

export function mgd(amount: number): Flow {
	// convert mega gallons to gallons
	const gallons = scale(gallon(amount), 1_000_000);
	return divide(gallons, day(1)) as Flow;
}

export function imgd(amount: number): Flow {
	// convert imperial mega gallons to imperial gallons
	const imperial_gallons = scale(imperial_gallon(amount), 1_000_000);
	return divide(imperial_gallons, day(1)) as Flow;
}

export function afd(amount: number): Flow {
	const cubic_foot = multiply(foot(1), multiply(foot(1), foot(1)));
	const cubic_feet = scale(cubic_foot, amount * 43560);
	return divide(cubic_feet, day(1)) as Flow;
}

export function lpm(amount: number): Flow {
	return divide(liter(amount), minute(1)) as Flow;
}

export function mld(amount: number): Flow {
	const liters = scale(liter(amount), 1_000_000);
	return divide(liters, day(1)) as Flow;
}

export function cmh(amount: number): Flow {
	const cubic_meter = multiply(meter(1), multiply(meter(1), meter(1)));
	const cubic_meters = scale(cubic_meter, amount);
	return divide(cubic_meters, hour(1)) as Flow;
}

export function cmd(amount: number): Flow {
	const cubic_meter = multiply(meter(1), multiply(meter(1), meter(1)));
	const cubic_meters = scale(cubic_meter, amount);
	return divide(cubic_meters, day(1)) as Flow;
}

export function fps(amount: number): Velocity {
	return divide(foot(amount), second(1)) as Velocity;
}

export function mps(amount: number): Velocity {
	return divide(meter(amount), second(1)) as Velocity;
}

// Basic model for conversion: Multiply by the reciprocal of a 1 quantity
// of the output unit
export function as_gpm(amount: Flow): number {
	return multiply(amount, reciprocal(gpm(1))).value;
}

export function convert_length(
	amount: Length,
	out: (x: number) => Length,
): number {
	return multiply(amount, reciprocal(out(1))).value;
}

export function convert_flow(amount: Flow, out: (x: number) => Flow): number {
	return multiply(amount, reciprocal(out(1))).value;
}

export function convert_pressure(
	amount: Pressure,
	out: (x: number) => Pressure,
): number {
	return multiply(amount, reciprocal(out(1))).value;
}

export function convert_velocity(
	amount: Velocity,
	out: (x: number) => Velocity,
): number {
	return multiply(amount, reciprocal(out(1))).value;
}

export function add(unit1: Unit, unit2: Unit): Unit {
	if (
		unit1.kilograms === unit2.kilograms &&
		unit1.meters === unit2.meters &&
		unit1.seconds === unit2.meters
	) {
		return {
			...unit1,
			value: unit1.value + unit2.value,
		};
	}
	throw new Error("Runtime unit error: dimensions do not match");
}

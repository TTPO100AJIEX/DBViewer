import PostgresInterval from "postgres-interval";

export default class Interval extends PostgresInterval
{
    static #format = /^([0123456789]+y)?([0123456789]+w)?([0123456789]+d)?([0123456789]+h)?([0123456789]+m)?([0123456789]+s)?$/;
    constructor(input)
    {
        switch (typeof input)
        {
            case "number":
            {
                super();
                this.seconds = input;
                break;
            }
            case "object":
            {
                super();
                if (input.years) this.years = input.years;
                if (input.months) this.months = input.months;
                if (input.days) this.days = input.days;
                if (input.hours) this.hours = input.hours;
                if (input.minutes) this.minutes = input.minutes;
                if (input.seconds) this.seconds = input.seconds;
                if (input.milliseconds) this.milliseconds = input.milliseconds;
                break;
            }
            case "string":
            {
                if (Interval.#format.test(input))
                {
                    super();
                    while (input.length != 0)
                    {
                        const index = input.search(/y|w|d|h|m|s/), number = Number(input.slice(0, index)), symbol = input[index]; input = input.slice(index + 1);
                        switch(symbol)
                        {
                            case "y": { this.years += number; break; }
                            case "w": { this.days += number * 7; break; }
                            case "d": { this.days += number; break; }
                            case "h": { this.hours += number; break; }
                            case "m": { this.minutes += number; break; }
                            case "s": { this.seconds += number; break; }
                            default: { }
                        }
                    }
                    break;
                }
            }
            default: { super(input); }
        }
        this.normalize();
    }

    normalize()
    {
        if (this.milliseconds >= 1000) { this.seconds += Math.floor(this.milliseconds / 1000); this.milliseconds %= 1000; }
        if (this.seconds >= 60) { this.minutes += Math.floor(this.seconds / 60); this.seconds %= 60; }
        if (this.minutes >= 60) { this.hours += Math.floor(this.minutes / 60); this.minutes %= 60; }
        if (this.hours >= 24) { this.days += Math.floor(this.hours / 24); this.hours %= 24; }
        this.days += this.months * 30; this.months = 0;
        if (this.days >= 365) { this.years += Math.floor(this.days / 365); this.days %= 365; }
        if (this.days >= 30) { this.months += Math.floor(this.days / 30); this.days %= 30; }
    }

    toSeconds() { return (((this.years * 365 + this.months * 30 + this.days) * 24 + this.hours) * 60 + this.minutes) * 60 + this.seconds; }
    toFormat()
    {
        let answer = "";
        if (this.years != 0) answer = `${this.years}y`;
        if (this.months + this.days != 0) answer += `${this.months + this.days}d`;
        if (this.hours != 0) answer += `${this.hours}h`;
        if (this.minutes != 0) answer += `${this.minutes}m`;
        if (this.seconds != 0) answer += `${this.seconds}s`;
        return answer;
    }
};
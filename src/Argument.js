// @flow

export default class Argument {
  name: string;
  required: boolean;
  variadic: boolean;

  constructor(name: string, required: boolean = false, variadic: boolean = false) {
    this.name = name;
    this.required = required;
    this.variadic = variadic;
  }
}

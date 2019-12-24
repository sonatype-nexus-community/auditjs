import ora from 'ora';

export class Spinner {
  private spinner?: ora.Ora;

  constructor(readonly silent: boolean = false) {
    if (!silent) {
      this.spinner = ora("Starting application").start();
      this.spinner.succeed();
    }
  }

  public maybeCreateMessageForSpinner(message: string) {
    if (!this.silent) {
      this.spinner?.start(message);
    }
  }

  public maybeSucceed() {
    if (!this.silent) {
      this.spinner?.succeed();
    }
  }

  public maybeStop() {
    if (!this.silent) {
      this.spinner?.stop();
    }
  }

  public maybeFail() {
    if (!this.silent) {
      this.spinner?.fail();
    }
  }
}

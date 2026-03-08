require_relative 'lib/nn/version'

REPO_URL = "https://github.com/hectron/nn"

Gem::Specification.new do |spec|
  spec.name          = "nn"
  spec.license       = "MIT"
  spec.version       = Nn::VERSION
  spec.authors       = ["Hector Rios"]
  spec.email         = ["that.hector@gmail.com"]

  spec.summary       = "A command-line package to manage your notes"
  spec.description   = %q{A powerful CLI to manage notes in your favorite $EDITOR}
  spec.homepage      = REPO_URL
  spec.required_ruby_version = Gem::Requirement.new(">= 2.3.0")

  #spec.metadata["allowed_push_host"] = "TODO: Set to 'http://mygemserver.com'"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = REPO_URL
  spec.metadata["changelog_uri"] = "#{REPO_URL}/blob/master/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files         = Dir.chdir(File.expand_path('..', __FILE__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]
  spec.extensions    = ["ext/nn/extconf.rb"]
end

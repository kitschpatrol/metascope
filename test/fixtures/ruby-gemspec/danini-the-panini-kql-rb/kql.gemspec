# frozen_string_literal: true

require_relative "lib/kql/version"

Gem::Specification.new do |spec|
  spec.name          = "kql"
  spec.version       = KQL::VERSION
  spec.authors       = ["Danielle Smith"]
  spec.email         = ["danini@hey.com"]

  spec.summary       = "KDL Query Language."
  spec.description   = "A query language for navigating KDL documents"
  spec.homepage      = "https://kdl.dev"
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 2.4.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/danini-the-panini/kql-rb"
  spec.metadata["changelog_uri"] = "https://github.com/danini-the-panini/kql-rb/releases"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{\A(?:test|spec|features)/}) }
  end
  spec.require_paths = ["lib"]

  spec.add_development_dependency 'racc', '~> 1.5'
  spec.add_development_dependency 'kdl', '~> 1.0.0'
end

require_relative "lib/close_encounters/version"

Gem::Specification.new do |spec|
  spec.name = "close_encounters"
  spec.version = CloseEncounters::VERSION
  spec.authors = ["Jim Gay"]
  spec.email = ["jim@saturnflyer.com"]
  spec.homepage = "https://github.com/SOFware/close_encounters"
  spec.summary = "Close Encounters of the Third Party"
  spec.description = "Keep track of responses from third party systems. Use this to monitor and respond to changes in status."
  spec.license = "MIT"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/SOFware/close_encounters"
  spec.metadata["changelog_uri"] = "https://github.com/SOFware/close_encounters/blob/main/CHANGELOG.md"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir["{app,config,db,lib}/**/*", "MIT-LICENSE", "Rakefile", "README.md", "CHANGELOG.md"]
  end

  spec.add_dependency "railties", ">= 7.1"
  spec.add_dependency "activerecord"
  spec.add_dependency "actionpack"
  spec.add_dependency "actionview"
  spec.add_dependency "activesupport"
  spec.add_dependency "rails-controller-testing"
end

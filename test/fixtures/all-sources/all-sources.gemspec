Gem::Specification.new do |s|
  s.name = "all-sources-fixture"
  s.version = "1.0.0"
  s.authors = ["Test Author", "Contributor One"]
  s.email = "test@example.com"
  s.summary = "A comprehensive test fixture."
  s.description = "A comprehensive test fixture for metadata extraction."
  s.homepage = "https://example.com/all-sources"
  s.license = "MIT"
  s.licenses = ["MIT"]
  s.platform = "ruby"
  s.required_ruby_version = ">= 3.0"
  s.required_rubygems_version = ">= 3.0"
  s.require_paths = ["lib"]
  s.bindir = "bin"
  s.executables = ["all-sources"]
  s.files = ["lib/all-sources.rb", "README.md"]
  s.test_files = ["test/test_all.rb"]
  s.extra_rdoc_files = ["README.md"]
  s.rdoc_options = ["--main", "README.md"]
  s.extensions = ["ext/extconf.rb"]
  s.cert_chain = ["certs/cert.pem"]
  s.signing_key = "certs/key.pem"
  s.post_install_message = "Thanks for installing!"
  s.metadata = {
    "source_code_uri" => "https://github.com/test-org/all-sources",
    "changelog_uri" => "https://github.com/test-org/all-sources/blob/main/CHANGELOG.md"
  }

  s.add_runtime_dependency "rake", ">= 13.0"
  s.add_development_dependency "minitest", "~> 5.0"
end
